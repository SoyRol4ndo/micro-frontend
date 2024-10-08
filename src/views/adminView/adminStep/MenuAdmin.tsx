import { Add, AddCircle, DeleteOutline, ExpandMore, Send, Verified } from '@mui/icons-material';
import { Accordion, AccordionDetails, AccordionSummary, Button, FormControlLabel, Grid, IconButton, Paper, Switch, TextField, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import React, { useEffect, useState, useCallback } from 'react';
import { default as swal } from 'sweetalert2';
import { v4 as uuidv4 } from 'uuid';
import { ImageUploader } from '../../../components/imageUploader/ImageUploader';
import { useAdminStore } from '../../../store/useAdminStore';
import _ from 'lodash';
import { useSocketStore } from '../../../store/useSocketStore';

interface MenuItem {
    id: string;
    nombre: string;
    descripcion: string;
    precio: number;
    foto: string;
    habilitado: boolean;
}

const Android12Switch = styled(Switch)(({ theme }) => ({
    padding: 8,
    '& .MuiSwitch-track': {
        borderRadius: 22 / 2,
        '&::before, &::after': {
            content: '""',
            position: 'absolute',
            top: '50%',
            transform: 'translateY(-50%)',
            width: 16,
            height: 16,
        },
        '&::before': {
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
                theme.palette.getContrastText(theme.palette.primary.main),
            )}" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>')`,
            left: 12,
        },
        '&::after': {
            backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="16" width="16" viewBox="0 0 24 24"><path fill="${encodeURIComponent(
                theme.palette.getContrastText(theme.palette.primary.main),
            )}" d="M19,13H5V11H19V13Z" /></svg>')`,
            right: 12,
        },
    },
    '& .MuiSwitch-thumb': {
        boxShadow: 'none',
        width: 16,
        height: 16,
        margin: 2,
    },
}));

interface MenuSection {
    id: string;
    nombre: string;
    items: MenuItem[];
}

export const MenuAdmin: React.FC = () => {
    const [sections, setSections] = useState<MenuSection[]>([]);
    const [checkedSections, setCheckedSections] = useState<MenuSection[]>([]);
    const [isChecked, setIsChecked] = useState(false);
    const [newSectionName, setNewSectionName] = useState<string>('');

    const { setMenuSections, menuSections, removeMenuSections } = useAdminStore();
    const { socket } = useSocketStore();

    const saveToLocalStorage = useCallback((data: MenuSection[]) => {
        localStorage.setItem('menuAdminData', JSON.stringify(data));
    }, []);

    const loadFromLocalStorage = useCallback((): MenuSection[] | null => {
        const data = localStorage.getItem('menuAdminData');
        return data ? JSON.parse(data) : null;
    }, []);

    useEffect(() => {
        const localData = loadFromLocalStorage();
        if (localData) {
            setSections(localData);
        } else if (menuSections.length > 0) {
            setSections(menuSections);
        }
    }, [menuSections, loadFromLocalStorage]);

    const compareWithChecked = useCallback(() => {
        if (!isChecked) return;

        const isEqual = _.isEqual(sections, checkedSections);
        if (!isEqual) {
            swal.fire('Atención', 'Se han detectado cambios desde la última comprobación. Por favor, vuelva a comprobar antes de enviar.', 'warning');
            setIsChecked(false);
        }
    }, [isChecked, sections, checkedSections]);

    useEffect(() => {
        if (isChecked) {
            compareWithChecked();
        }
    }, [sections, isChecked, compareWithChecked]);

    const handleSectionChange = useCallback((updatedSections: MenuSection[]) => {
        setSections(updatedSections);
        saveToLocalStorage(updatedSections);
    }, [saveToLocalStorage]);

    const handleAddSection = () => {
        if (newSectionName.trim() === '') return;

        const newSection: MenuSection = {
            id: uuidv4(),
            nombre: newSectionName,
            items: [],
        };

        handleSectionChange([...sections, newSection]);
        setNewSectionName('');
    };

    const handleAddItem = (sectionId: string) => {
        const newItem: MenuItem = {
            id: uuidv4(),
            nombre: '',
            descripcion: '',
            precio: 0,
            foto: '',
            habilitado: true,
        };

        const updatedSections = sections.map((section) =>
            section.id === sectionId
                ? { ...section, items: [...section.items, newItem] }
                : section
        );

        handleSectionChange(updatedSections);
    };

    const handleDeleteItem = (sectionId: string, itemId: string) => {
        const updatedSections = sections.map((section) =>
            section.id === sectionId
                ? { ...section, items: section.items.filter((item) => item.id !== itemId) }
                : section
        );

        handleSectionChange(updatedSections);
    };

    const handleDeleteSection = (sectionId: string) => {
        const updatedSections = sections.filter((section) => section.id !== sectionId);
        handleSectionChange(updatedSections);
    };

    const handleFileBase64Change = (sectionId: string, itemId: string, base64: string | null) => {
        const updatedSections = sections.map((section) =>
            section.id === sectionId
                ? {
                    ...section,
                    items: section.items.map((item) =>
                        item.id === itemId ? { ...item, foto: base64 || '' } : item
                    ),
                }
                : section
        );

        handleSectionChange(updatedSections);
    };

    const handleAccept = () => {
        const hasEmptySections = sections.some((section) => section.items.length === 0);

        if (sections.length === 0) {
            swal.fire('Error', 'No hay datos para gestionar', 'error');
            return;
        }

        if (hasEmptySections) {
            swal.fire('No tan rápido', 'Todas las secciones deben tener al menos un ítem', 'error');
            return;
        }

        const hasIncompleteItems = sections.some((section) =>
            section.items.some((item) => !item.nombre || !item.descripcion || item.precio <= 0 || !item.foto)
        );

        if (hasIncompleteItems) {
            swal.fire('No tan rápido', 'Hay campos que faltan por completar', 'error');
            return;
        }

        setCheckedSections(_.cloneDeep(sections));
        setIsChecked(true);
        setMenuSections(sections);
        saveToLocalStorage(sections);
        swal.fire('Éxito', 'Los datos han sido comprobados correctamente', 'success');
    };

    const sendData = () => {
        if (!isChecked) {
            swal.fire('Error', 'Por favor, compruebe los datos antes de enviar', 'error');
            return;
        }
        socket.emit('send-item', sections);
        console.log(sections);
        saveToLocalStorage(sections);
        swal.fire('Éxito', 'Los datos han sido enviados correctamente', 'success');
    };

    return (
        <Paper elevation={3} sx={{ minHeight: '30%', margin: '6px 16px' }}>
            <div style={{ margin: '6px 16px', height: '100%' }}>
                <div style={{ padding: "24px 0px", textAlign: 'center' }}>
                    <div className='flex items-center gap-3'>
                        <Typography variant="h6" sx={{ margin: 0 }}>Gestión de Menú</Typography>
                        {isChecked && <Verified color='success' />}
                    </div>
                </div>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={10}>
                        <TextField
                            label="Nombre de la nueva sección"
                            variant="outlined"
                            size='small'
                            fullWidth
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={2}>
                        <Button
                            variant="contained"
                            color="primary"
                            fullWidth
                            onClick={handleAddSection}
                            startIcon={<Add />}
                            sx={{ textTransform: 'none' }}
                        >
                            Agregar sección
                        </Button>
                    </Grid>
                </Grid>

                {sections.map((section) => (
                    <Accordion key={section.id} style={{ marginTop: 20 }}>
                        <AccordionSummary expandIcon={<ExpandMore />}>
                            <Typography variant="h5">
                                {section.nombre}
                                <IconButton color="secondary" onClick={() => handleDeleteSection(section.id)} >
                                    <DeleteOutline color='error' />
                                </IconButton>
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                            <Button
                                variant="outlined"
                                color="secondary"
                                startIcon={<AddCircle />}
                                onClick={() => handleAddItem(section.id)}
                                style={{ marginBottom: 10, textTransform: 'none' }}
                            >
                                Agregar Opción
                            </Button>

                            <Grid container spacing={2}>
                                {section.items.map((item) => (
                                    <Grid item xs={12} sm={6} md={4} key={item.id}>
                                        <div style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '16px' }}>
                                            <div className='flex gap-2'>
                                                <TextField
                                                    label="Nombre"
                                                    variant="outlined"
                                                    fullWidth
                                                    size='small'
                                                    value={item.nombre}
                                                    onChange={(e) => {
                                                        const updatedSections = sections.map((sec) =>
                                                            sec.id === section.id
                                                                ? {
                                                                    ...sec,
                                                                    items: sec.items.map((it) =>
                                                                        it.id === item.id ? { ...it, nombre: e.target.value } : it
                                                                    ),
                                                                }
                                                                : sec
                                                        );
                                                        handleSectionChange(updatedSections);
                                                    }}
                                                    style={{ marginBottom: 10 }}
                                                />
                                                <TextField
                                                    label="Precio ($)"
                                                    variant="outlined"
                                                    type="number"
                                                    sx={{ maxWidth: '100px' }}
                                                    size='small'
                                                    value={item.precio}
                                                    onChange={(e) => {
                                                        const updatedSections = sections.map((sec) =>
                                                            sec.id === section.id
                                                                ? {
                                                                    ...sec,
                                                                    items: sec.items.map((it) =>
                                                                        it.id === item.id ? { ...it, precio: parseFloat(e.target.value) } : it
                                                                    ),
                                                                }
                                                                : sec
                                                        );
                                                        handleSectionChange(updatedSections);
                                                    }}
                                                    style={{ marginBottom: 10 }}
                                                />
                                            </div>
                                            <TextField
                                                label="Descripción"
                                                variant="outlined"
                                                fullWidth
                                                size='small'
                                                multiline
                                                rows={2}
                                                value={item.descripcion}
                                                onChange={(e) => {
                                                    const updatedSections = sections.map((sec) =>
                                                        sec.id === section.id
                                                            ? {
                                                                ...sec,
                                                                items: sec.items.map((it) =>
                                                                    it.id === item.id ? { ...it, descripcion: e.target.value } : it
                                                                ),
                                                            }
                                                            : sec
                                                    );
                                                    handleSectionChange(updatedSections);
                                                }}
                                                style={{ marginBottom: 10 }}
                                            />

                                            <ImageUploader
                                                setFileBase64={(base64 = '') => handleFileBase64Change(section.id, item.id, base64)}
                                                fileBase64={item.foto}
                                            />
                                            <div className='flex justify-between mt-3'>
                                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                                    <FormControlLabel
                                                        control={
                                                            <Android12Switch
                                                                checked={item.habilitado}
                                                                onChange={(e) => {
                                                                    const updatedSections = sections.map((sec) =>
                                                                        sec.id === section.id
                                                                            ? {
                                                                                ...sec,
                                                                                items: sec.items.map((it) =>
                                                                                    it.id === item.id ? { ...it, habilitado: e.target.checked } : it
                                                                                ),
                                                                            }
                                                                            : sec
                                                                    );
                                                                    handleSectionChange(updatedSections);
                                                                }}
                                                            />
                                                        }
                                                        label="Habilitado"
                                                    />
                                                </div>

                                                <IconButton
                                                    color="error"
                                                    onClick={() => handleDeleteItem(section.id, item.id)}
                                                >
                                                    <DeleteOutline />
                                                </IconButton>
                                            </div>
                                        </div>
                                    </Grid>
                                ))}
                            </Grid>
                        </AccordionDetails>
                    </Accordion>
                ))}
            </div>

            <div className='flex justify-end p-4 gap-5'>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAccept}
                    sx={{ textTransform: 'none' }}
                    startIcon={<Verified />}
                >
                    Comprobar
                </Button>

                <Button
                    onClick={sendData}
                    startIcon={<Send />}
                    variant='outlined'
                    disabled={!isChecked}
                >
                    Enviar
                </Button>
            </div>
        </Paper>
    );
};